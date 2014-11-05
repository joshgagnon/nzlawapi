<?xml version="1.0"?>

<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">
      <xsl:for-each select="prov">
      	<div class="prov">
      		<xsl:attribute name="id">
      			<xsl:value-of select="@id"/>
      		</xsl:attribute>
        	<h5 class="prov labelled">
	          	<span class="label"><xsl:value-of select="label"/></span>
	          	<span class="spc"></span>
	          	<xsl:value-of select="heading"/>
        	</h5>
        	<ul class="prov">
        		<xsl:for-each select="prov.body/subprov">
        			<li>
        				<div class="subprov">
        					<xsl:value-of select="para/text"/>
        				</div>
        				<ul class="label-para">
        					<xsl:for-each select="para/label-para">
        					<li>
	        	              <p class="labelled label">
	        					<span class="label">
	        						(<xsl:value-of select="label"/>)
	        					</span>
	        					<span class="spc"></span>
	    	    				<xsl:value-of select="para/text"/>
	    	    			   </p>
        					</li>
        					</xsl:for-each>
        				</ul>
        			</li>
        		</xsl:for-each>
        	</ul>
    	</div>
      </xsl:for-each>
</xsl:template>

</xsl:stylesheet>
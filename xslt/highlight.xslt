
<xsl:stylesheet version="1.0" xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

    <!-- <xsl:import href="transform.xslt"/> -->


         <xsl:param name="a" />
<xsl:template match="/">
           <foo><xsl:value-of select="$a" /></foo>
    </xsl:template>




<!-- <xsl:template match="text()">
    <xsl:value-of select="$highlight"/>
   <xsl:variable name="string" select="." />

    <xsl:variable name="before" select="substring-before($string, $highlight)"/>
    <xsl:choose>
        <xsl:when test="starts-with($string, $highlight) or string-length($before) &gt; 0">

            <xsl:value-of select="$before" />

            <span class="search_match"><xsl:value-of select="$highlight"/></span>
            <xsl:variable name="after" select="substring-after($string, $highlight)"/>
            <xsl:if test="string-length($after) &gt; 0">

            <xsl:apply-templates  />

            </xsl:if>
        </xsl:when>
        <xsl:otherwise>
            <xsl:value-of select="."/>
        </xsl:otherwise>
    </xsl:choose>
</xsl:template> -->

</xsl:stylesheet>
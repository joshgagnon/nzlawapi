<?xml version="1.0"?>

<xsl:stylesheet version="1.0"
xmlns:xsl="http://www.w3.org/1999/XSL/Transform">

<xsl:template match="/">



      <xsl:for-each select="prov">
        <h5>
          <span><xsl:value-of select="label"/></span>
          <span><xsl:value-of select="heading"/></span>
        </h5>
      </xsl:for-each>


</xsl:template>

</xsl:stylesheet>